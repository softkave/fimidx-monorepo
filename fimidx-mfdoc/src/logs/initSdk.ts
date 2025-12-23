import {mfdocConstruct, MfdocHttpEndpointMethod} from 'mfdoc';
import {AnyObject} from 'softkave-js-utils';
import {kTags} from '../tags.js';

export const initSdkSchema = mfdocConstruct.constructHttpEndpointDefinition<
  AnyObject,
  AnyObject,
  AnyObject,
  AnyObject,
  AnyObject,
  AnyObject
>({
  method: MfdocHttpEndpointMethod.Post,
  name: 'fimidx/logs/initSdk',
  description: 'Initialize SDK for file-based logging',
  tags: [kTags.public],
  path: '/logs/init',
  requestBody: mfdocConstruct.constructObject<AnyObject>({
    name: 'InitSdkArgs',
    description: 'The schema for initializing SDK (empty body)',
    fields: {},
  }),
});
