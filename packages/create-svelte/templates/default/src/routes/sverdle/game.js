import words_raw from './words.txt?raw';
import words_allowed_raw from './words_allowed.txt?raw';

const words = words_raw.split('\n').filter(Boolean);
const allowed = new Set([...words, ...words_allowed_raw.split('\n').filter(Boolean)]);

export class Game {
	/** @param {string | undefined} serialized */
	constructor(serialized) {
		if (serialized) {
			const [index, guesses, answers] = /** @type {[string, string, string]} */ (
				serialized.split('-')
			);

			this.index = +index;
			this.guesses = guesses ? guesses.split(' ') : [];
			this.answers = answers ? answers.split(' ') : [];
		} else {
			this.index = Math.floor(Math.random() * words.length);
			this.guesses = ['', '', '', '', '', ''];
			this.answers = /** @type {string[]} */ ([]);
		}

		this.answer = words[this.index];
	}

	/** @param {string[]} letters */
	enter(letters) {
		const word = letters.join('');
		const valid = allowed.has(word);

		if (!valid) return false;

		this.guesses[this.answers.length] = word;

		const available = Array.from(this.answer);
		const answer = Array(5).fill('_');

		// first, find exact matches
		for (let i = 0; i < 5; i += 1) {
			if (letters[i] === available[i]) {
				answer[i] = 'x';
				available[i] = ' ';
			}
		}

		// then find close matches (this has to happen
		// in a second step, otherwise an early close
		// match can prevent a later exact match)
		for (let i = 0; i < 5; i += 1) {
			const index = available.indexOf(letters[i]);
			if (index !== -1) {
				answer[i] = 'c';
				available[index] = ' ';
			}
		}

		this.answers.push(answer.join(''));

		return true;
	}

	toString() {
		return `${this.index}-${this.guesses.join(' ')}-${this.answers.join(' ')}`;
	}
}
