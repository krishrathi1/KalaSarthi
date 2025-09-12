/* Instagram Publishing Service
 * Publishes a single image with caption (and optional alt text) to an Instagram professional account.
 * Uses Graph API v23.0 endpoints.
 */

const IG_GRAPH_HOST = 'https://graph.instagram.com';
const API_VERSION = 'v23.0';

export interface PublishImageParams {
    igId: string;
    accessToken: string;
    imageUrl: string;
    caption?: string;
    altText?: string;
}

export interface PublishResult {
    success: boolean;
    mediaId?: string;
    containerId?: string;
    error?: string;
}

async function createMediaContainer(params: PublishImageParams): Promise<{ id: string }> {
    const url = `${IG_GRAPH_HOST}/${API_VERSION}/${params.igId}/media`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${params.accessToken}`
        },
        body: JSON.stringify({
            image_url: params.imageUrl,
            caption: params.caption,
            alt_text: params.altText
        })
    });
    const data = await res.json();
    if (!res.ok || !data?.id) {
        throw new Error(data?.error?.message || 'Failed to create media container');
    }
    return { id: data.id as string };
}

async function publishContainer(igId: string, accessToken: string, creationId: string): Promise<{ id: string }> {
    const url = `${IG_GRAPH_HOST}/${API_VERSION}/${igId}/media_publish`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ creation_id: creationId })
    });
    const data = await res.json();
    if (!res.ok || !data?.id) {
        throw new Error(data?.error?.message || 'Failed to publish media');
    }
    return { id: data.id as string };
}

export async function publishImage(params: PublishImageParams): Promise<PublishResult> {
    try {
        const container = await createMediaContainer(params);
        const published = await publishContainer(params.igId, params.accessToken, container.id);
        return { success: true, mediaId: published.id, containerId: container.id };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Instagram publish failed' };
    }
}


