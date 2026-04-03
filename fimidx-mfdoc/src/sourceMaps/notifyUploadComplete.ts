import {NotifySourceMapUploadCompleteArgs} from 'fimidx-core/definitions/sourceMap';
import {mfdocConstruct, MfdocHttpEndpointMethod} from 'mfdoc';
import {AnyObject} from 'softkave-js-utils';
import {kTags} from '../tags.js';
import {kProjectId} from '../utils.js';

export const notifySourceMapUploadCompleteSchema =
  mfdocConstruct.constructHttpEndpointDefinition<
    AnyObject,
    AnyObject,
    AnyObject,
    NotifySourceMapUploadCompleteArgs,
    AnyObject,
    AnyObject,
    NotifySourceMapUploadCompleteArgs
  >({
    method: MfdocHttpEndpointMethod.Post,
    name: 'fimidx/sourceMaps/notifyUploadComplete',
    description:
      'Notify that a source map upload is complete (call after uploading to fimidara).',
    tags: [kTags.public],
    path: '/source-maps/upload-complete',
    requestBody:
      mfdocConstruct.constructObject<NotifySourceMapUploadCompleteArgs>({
        name: 'NotifySourceMapUploadCompleteArgs',
        description: 'Arguments for notifying source map upload complete',
        fields: {
          projectId: mfdocConstruct.constructObjectField({
            required: true,
            data: kProjectId,
          }),
          repoIdentifier: mfdocConstruct.constructObjectField({
            required: true,
            data: mfdocConstruct.constructString({
              description: 'Repo identifier for the source map',
            }),
          }),
          version: mfdocConstruct.constructObjectField({
            required: true,
            data: mfdocConstruct.constructString({
              description: 'Version for the source map',
            }),
          }),
          isZip: mfdocConstruct.constructObjectField({
            required: true,
            data: mfdocConstruct.constructBoolean({
              description: 'Whether the uploaded file is a zip',
            }),
          }),
        },
      }),
  });
