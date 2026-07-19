import {ICallback} from 'fimidx-core/definitions/callback';

export interface IAddCallbackHttpOutgoingSuccessResponse {
  type: 'success';
  callback: ICallback;
}

export interface IAddCallbacksHttpOutgoingSuccessResponse {
  type: 'success';
  results: Array<{
    idempotencyKey: string;
    success: boolean;
    callback?: ICallback;
    error?: string;
  }>;
}
