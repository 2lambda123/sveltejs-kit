import {
	afterNavigate,
	beforeNavigate,
	goto,
	invalidate,
	prefetch,
	prefetchRoutes
} from '$app/navigation';
import { CSRPageNode, CSRPageNodeLoader, CSRRoute, ServerDataNode, Uses } from 'types';
import { HttpError } from '../../index/private.js';
import { SerializedHttpError } from '../server/page/types.js';

export interface Client {
	// public API, exposed via $app/navigation
	after_navigate: typeof afterNavigate;
	before_navigate: typeof beforeNavigate;
	disable_scroll_handling: () => void;
	goto: typeof goto;
	invalidate: typeof invalidate;
	prefetch: typeof prefetch;
	prefetch_routes: typeof prefetchRoutes;

	// private API
	_hydrate: (opts: {
		status: number;
		error: Error | SerializedHttpError;
		node_ids: number[];
		params: Record<string, string>;
		routeId: string | null;
	}) => Promise<void>;
	_start_router: () => void;
}

export type NavigationIntent = {
	/**
	 * `url.pathname + url.search`
	 */
	id: string;
	/**
	 * The route parameters
	 */
	params: Record<string, string>;
	/**
	 * The route that matches `path`
	 */
	route: CSRRoute;
	/**
	 * The destination URL
	 */
	url: URL;
};

export type NavigationResult = NavigationRedirect | NavigationFinished;

export type NavigationRedirect = {
	type: 'redirect';
	location: string;
};

export type NavigationFinished = {
	type: 'loaded';
	state: NavigationState;
	props: Record<string, any>;
};

export type BranchNode = {
	node: CSRPageNode;
	loader: CSRPageNodeLoader;
	server: ServerDataNode | null;
	shared: DataNode | null;
	data: Record<string, any> | null;
};

export interface DataNode {
	data: Record<string, any> | null;
	uses: Uses;
}

export type NavigationState = {
	branch: Array<BranchNode | undefined>;
	error: HttpError | Error | null;
	params: Record<string, string>;
	session_id: number;
	url: URL;
};
