// src/lib/utils/markdown.js
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

marked.setOptions({
	highlight: function (code, lang) {
		if (lang && hljs.getLanguage(lang)) {
			return hljs.highlight(lang, code).value;
		} else {
			return hljs.highlightAuto(code).value;
		}
	}
});

export function parseMarkdown(content) {
	const rawHtml = marked(content);
	return DOMPurify.sanitize(rawHtml);
}
