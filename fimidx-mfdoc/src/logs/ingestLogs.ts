import {IngestLogsEndpointArgs} from 'fimidx-core/definitions/log';
import {mfdocConstruct, MfdocHttpEndpointMethod} from 'mfdoc';
import {AnyObject} from 'softkave-js-utils';
import {kTags} from '../tags.js';
import {kProjectId} from '../utils.js';

export const ingestLogsSchema = mfdocConstruct.constructHttpEndpointDefinition<
  AnyObject,
  AnyObject,
  AnyObject,
  IngestLogsEndpointArgs,
  AnyObject,
  AnyObject
>({
  method: MfdocHttpEndpointMethod.Post,
  name: 'fimidx/logs/ingestLogs',
  description: 'Ingest logs',
  tags: [kTags.public],
  path: '/logs',
  requestBody: mfdocConstruct.constructObject<IngestLogsEndpointArgs>({
    name: 'IngestLogsArgs',
    description: 'The schema for ingesting logs',
    fields: {
      projectId: mfdocConstruct.constructObjectField({
        required: true,
        data: kProjectId,
      }),
      logs: mfdocConstruct.constructObjectField({
        required: true,
        data: mfdocConstruct.constructArray({
          type: mfdocConstruct.constructObject({
            name: 'InputLogRecord',
          }),
        }),
      }),
    },
  }),
});
