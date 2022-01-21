import { RequestEvent } from './hooks';
import { Either, JSONString, MaybePromise, ResponseHeaders } from './helper';

type Body = JSONString | Uint8Array | ReadableStream | import('stream').Readable;

export interface EndpointOutput {
	status?: number;
	headers?: Headers | Partial<ResponseHeaders>;
	body?: Body;
}

export interface Fallthrough {
	fallthrough: true;
}

export interface RequestHandler<Locals = Record<string, any>, Platform = Record<string, unknown>> {
	(event: RequestEvent<Locals, Platform>): MaybePromise<
		Either<Response | EndpointOutput, Fallthrough>
	>;
}
