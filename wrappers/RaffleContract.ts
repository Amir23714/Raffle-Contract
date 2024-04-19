import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

const INITIAL_NUM_PARTICIPANTS = 0;
const MIN_DEPOSIT: bigint = 1000000000n;

export type RaffleContractConfig = {
    owner_address: Address;
    recent_winner: Address;
};

export function raffleContractConfigToCell(config: RaffleContractConfig): Cell {
    return beginCell()
        .storeAddress(config.owner_address)
        .storeAddress(config.recent_winner)
        .storeInt(INITIAL_NUM_PARTICIPANTS, 16)
        .endCell();
}

export class RaffleContract implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new RaffleContract(address);
    }

    static createFromConfig(config: RaffleContractConfig, code: Cell, workchain = 0) {
        const data = raffleContractConfigToCell(config);
        const init = { code, data };
        return new RaffleContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeInt(0, 16).endCell(),
        });
    }

    // State Changing Functions
    
    // Deposit for participation in the raffle
    async sendDeposit(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeInt(1, 16).endCell(),
        });
    }

    // Withdraw method is only available for the owner of the contract
    async sendWithdraw(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeInt(2, 16).endCell(),
        });
    }

    async sendStartRaffleProcess(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeInt(3, 16).endCell(),
        });
    }

    // GET Functions

    async getOwner(provider: ContractProvider) {
        const { stack } = await provider.get('get_owner_address', []);

        return {
            owner_address: stack.readAddress(),
        };
    }

    async getRecentWinner(provider: ContractProvider) {
        const { stack } = await provider.get('get_recent_winner', []);

        return {
            recent_winner: stack.readAddress(),
        };
    }

    async getNumParticipants(provider: ContractProvider) {
        const { stack } = await provider.get('get_num_participants', []);

        return {
            num_participants: stack.readNumber(),
        };
    }

    async getContractBalance(provider: ContractProvider) {
        const { stack } = await provider.get('get_current_balance', []);

        return {
            contract_balance: stack.readBigNumber(),
        };
    }
}
