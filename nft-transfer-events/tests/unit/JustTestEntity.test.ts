import { JustTestEntityDAO } from './../utils/justTest.entity';

describe('Entity', function () {
    it(`Should create table when it does not exist`, async () => {
        const nftEventsDB = new JustTestEntityDAO();
        const tableCreted = await nftEventsDB.connect();

        expect(tableCreted).toEqual(true);
    });

    it(`Should NOT create table when it exists`, async () => {
        const nftEventsDB = new JustTestEntityDAO();
        const tableCreted = await nftEventsDB.connect();

        expect(tableCreted).toEqual(false);
    });
});
