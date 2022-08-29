export interface IEvent {
    transactionHash: string;
    blockNumber: string;
    args: {
        from: string;
        to: string;
        tokenId: string;
    };
}
