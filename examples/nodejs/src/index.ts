import { Cohort, getPorterUri } from '@nucypher/shared';

const myCohort = Cohort.create(getPorterUri('tapir'), 4);
console.log(myCohort);
