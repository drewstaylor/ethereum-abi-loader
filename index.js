import 'dotenv/config';
import fetch from 'node-fetch';

const rpc = process.env.RPC;
const argv = process.argv;
const apiKey = process.env.ETHERSCAN_API_KEY;
const mainnet = 'api';
const testnet = 'api-sepolia';
const subdomain = rpc.indexOf('sepolia') < 0 ? mainnet : testnet;
const baseUrl = `https://${subdomain}.etherscan.io/api?module=contract&action=getabi&address=`;
const suffixUrl = `&tag=latest&apikey=${apiKey}`;

const httpOptions = {
  method: 'GET',
  headers: { Accept: 'application/json, text/plain, */*' },
};

const stateMutability = {
  query: ["pure", "view"],
  tx: ["payable", "nonpayable"]
};

async function fetchAbi(address) {
  if (!address || typeof address !== 'string') 
    throw Error("A contract address is required, received " + address);
  if (address.substring(0,2) !== "0x") 
    throw Error("Invalid contract address " + address);

  const url = baseUrl + address + suffixUrl;
  const response = await fetch(url, httpOptions);
  const data = await response.json();
  
  if (!data['result'] || typeof data['result'] !== 'string') 
    throw Error("Error resolving for ABI JSON for address " + address);

  const abi = JSON.parse(data.result);
  return abi;
}

function parseAbi(abi) {
  if (!Array.isArray(abi))
    throw Error('Error parsing ABI, expected array object but received ' + typeof abi);

  let entrypoints = {
    query: [],
    tx: [],
  };
  abi.forEach(item => {
    if (item.type) {
      let entrypoint;
      if (item.type === "function") entrypoint = {
        name: item.name,
        inputs: item.inputs,
        type: item.stateMutability
      };
      if (stateMutability.query.indexOf(item.stateMutability) >= 0) 
        entrypoints.query.push(entrypoint);
      else if (stateMutability.tx.indexOf(item.stateMutability) >= 0) 
        entrypoints.tx.push(entrypoint);
    }
  });
  return entrypoints;
}

async function main() {
  let contract;
  if (argv[argv.length-1].substring(0,2) === "0x") contract = argv[argv.length-1];
  if (!contract) throw Error("A contract address is required");

  console.log("Fetching ABI JSON for address " + contract);

  const abi = await fetchAbi(contract);
  const entrypoints = parseAbi(abi);
  console.log(entrypoints);
}

main();