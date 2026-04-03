import {
  GetSourceMapUploadTokenArgs,
  GetSourceMapUploadTokenResult,
} from 'fimidx-core/definitions/sourceMap';
import {mfdocConstruct, MfdocHttpEndpointMethod} from 'mfdoc';
import {AnyObject} from 'softkave-js-utils';
import {kTags} from '../tags.js';
import {kProjectId} from '../utils.js';

export const getSourceMapUploadTokenSchema =
  mfdocConstruct.constructHttpEndpointDefinition<
    AnyObject,
    AnyObject,
    AnyObject,
    GetSourceMapUploadTokenArgs,
    AnyObject,
    GetSourceMapUploadTokenResult,
    GetSourceMapUploadTokenArgs
  >({
    method: MfdocHttpEndpointMethod.Post,
    name: 'fimidx/sourceMaps/getUploadToken',
    description:
      'Get a fimidara token and file path for uploading source maps (upload to filePath).',
    tags: [kTags.public],
    path: '/source-maps/upload-token',
    requestBody: mfdocConstruct.constructObject<GetSourceMapUploadTokenArgs>({
      name: 'GetSourceMapUploadTokenArgs',
      description: 'Arguments for getting a source map upload token.',
      fields: {
        projectId: mfdocConstruct.constructObjectField({
          required: true,
          data: kProjectId,
        }),
        repoIdentifier: mfdocConstruct.constructObjectField({
          required: true,
          data: mfdocConstruct.constructString({
            description: 'Repo identifier for the source map.',
          }),
        }),
        version: mfdocConstruct.constructObjectField({
          required: true,
          data: mfdocConstruct.constructString({
            description: 'Version for the source map.',
          }),
        }),
      },
    }),
    responseBody: mfdocConstruct.constructObject<GetSourceMapUploadTokenResult>(
      {
        name: 'GetSourceMapUploadTokenResult',
        description:
          'Token and fimidara file path for uploading the source map zip.',
        fields: {
          token: mfdocConstruct.constructObjectField({
            required: true,
            data: mfdocConstruct.constructString({
              description: 'fimidara auth token for upload.',
            }),
          }),
          filePath: mfdocConstruct.constructObjectField({
            required: true,
            data: mfdocConstruct.constructString({
              description: 'Full fimidara file path to upload the zip to.',
            }),
          }),
        },
      },
    ),
  });
