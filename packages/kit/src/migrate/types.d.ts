export interface BranchHierarchy {
	/**
	 * The whole relative path to this dir
	 */
	path: string;
	/**
	 * Files in that dir
	 */
	files: Array<{ moved_down: boolean; name: string }>;
	/**
	 * Recurse
	 */
	folders: BranchHierarchy[];
}

export interface Node {
	start: number;
	end: number;
	[propName: string]: any;
}

export interface Attribute {
	name: string;
	value: string;
}

export interface VerbatimElement extends Node {
	name: string;
	attributes: Attribute[];
	content: {
		start: number;
		end: number;
		value: string;
	};
}
