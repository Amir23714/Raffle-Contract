# Raffle
My first smart contract on TON blockchain developed on FunC

## Description
The objective of this project is to develop a contract that enables N participants to each deposit 1 TON into the contract. Once all N participants have made their deposits, the contract will randomly select one participant and transfer him N-1 TONs.

Owner wallet is pre-defined in the contract and can be used to deploy the contract and to call the `start_raffle_process` function. The `start_raffle_process` function will be executable only when number of participants will be equal to maximum number N. The owner can always withdraw `owner_fee` from the contract, but only after the current raffle process is completed (number of participants equal to zero).

Owner is not able to participate in the raffle!!!

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Run onchain test
`npm run onchaintest::TESTNET` or `npm run onchaintest::MAINNET`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`
