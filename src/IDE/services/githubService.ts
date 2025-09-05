import type { Directory, FileSystemNode, GistApiResponse } from "../types";

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Recursively traverses the file system to create a flat object
 * suitable for the GitHub Gists API.
 */
const flattenFsForGist = (node: FileSystemNode, path = ''): Record<string, { content: string }> => {
    let files: Record<string, { content: string }> = {};

    if (node.type === 'directory') {
        for (const childName in node.children) {
            const childNode = node.children[childName];
            const newPath = path ? `${path}/${childName}` : childName;
            files = { ...files, ...flattenFsForGist(childNode, newPath) };
        }
    } else {
        if (path) {
            files[path] = { content: node.content ?? '' };
        }
    }
    return files;
};

/**
 * Creates a new secret GitHub Gist from the current workspace files.
 */
export const createGist = async (fs: Directory, token: string, description = 'CodeCraft IDE Workspace Snapshot'): Promise<GistApiResponse> => {
    const files = flattenFsForGist(fs);
    if (Object.keys(files).length === 0) {
        throw new Error("Cannot create an empty Gist. Add some content to your files.");
    }
    
    const response = await fetch(`${GITHUB_API_URL}/gists`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
            description,
            public: false,
            files: files,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API Error: ${errorData.message || 'Failed to create Gist'}`);
    }

    return response.json();
};

/**
 * Fetches the contents of a specific GitHub Gist.
 */
export const fetchGist = async (gistId: string, token: string): Promise<GistApiResponse> => {
     const response = await fetch(`${GITHUB_API_URL}/gists/${gistId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API Error: ${errorData.message || 'Failed to fetch Gist'}`);
    }

    return response.json();
}

/**
 * Fetches authenticated user's profile info.
 */
export const fetchGithubUser = async (token: string): Promise<{ login: string; avatar_url: string; html_url: string }> => {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API Error: ${errorData.message || 'Failed to fetch user'}`);
    }

    return response.json();
};
