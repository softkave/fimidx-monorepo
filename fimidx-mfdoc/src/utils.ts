import {mfdocConstruct} from 'mfdoc';

export const kIso8601DateString = mfdocConstruct.constructString({
  description: 'The ISO 8601 date string',
});

export const kNumberTimestamp = mfdocConstruct.constructNumber({
  description: 'The number timestamp',
});

export const kDateOrNumber = mfdocConstruct.constructOrCombination({
  description: 'The date or number timestamp',
  types: [kIso8601DateString, kNumberTimestamp],
});

export const kDateOrNumberOrNull = mfdocConstruct.constructOrCombination({
  description: 'The date or number timestamp or null',
  types: [
    kIso8601DateString,
    kNumberTimestamp,
    mfdocConstruct.constructNull({}),
  ],
});

export const kgroupId = mfdocConstruct.constructString({
  description: 'The group ID',
});

export const kProjectId = mfdocConstruct.constructString({
  description: 'The project ID',
});

export const kClientTokenId = mfdocConstruct.constructString({
  description: 'The client token ID',
});
