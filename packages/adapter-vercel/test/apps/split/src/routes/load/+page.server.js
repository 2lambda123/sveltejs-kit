import page1 from '$lib/page1.txt';

/** @type {import('./$types').PageServerLoad} */
export async function load({ parent }) {
	return { ...(await parent()), page1 };
}