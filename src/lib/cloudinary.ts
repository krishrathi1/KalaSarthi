// Simple Cloudinary upload utilities
export interface CloudinaryUploadResult {
    public_id: string;
    secure_url: string;
    url: string;
    width: number;
    height: number;
    format: string;
    resource_type: string;
    bytes: number;
}

export interface CloudinaryConfig {
    cloudName: string;
    uploadPreset: string;
}

export interface UploadOptions {
    folder?: string;
    tags?: string[];
    public_id?: string;
}

// Get Cloudinary configuration from environment variables
export const getCloudinaryConfig = (): CloudinaryConfig => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName) {
        throw new Error(
            'Missing Cloudinary cloud name. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in your environment variables.'
        );
    }

    // If no upload preset is configured, we'll use unsigned uploads
    return {
        cloudName,
        uploadPreset: uploadPreset || 'unsigned_upload'
    };
};

// Upload image to Cloudinary
export const uploadToCloudinary = async (
    file: File,
    options: UploadOptions = {}
): Promise<CloudinaryUploadResult> => {
    try {
        const config = getCloudinaryConfig();

        const formData = new FormData();

        // Handle unsigned uploads (when no preset is configured or preset doesn't exist)
        if (config.uploadPreset && config.uploadPreset !== 'unsigned_upload' && config.uploadPreset !== '') {
            formData.append('upload_preset', config.uploadPreset);
        }
        // For unsigned uploads, don't include upload_preset parameter at all

        formData.append('file', file);

        if (options.folder) {
            formData.append('folder', options.folder);
        }

        if (options.tags && options.tags.length > 0) {
            formData.append('tags', options.tags.join(','));
        }

        if (options.public_id) {
            formData.append('public_id', options.public_id);
        }

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Cloudinary API Error:', errorData);

            // If upload preset error, try without preset (unsigned upload)
            if (errorData.error?.message?.includes('Upload preset') && config.uploadPreset) {
                console.log('Retrying upload without preset (unsigned upload)...');

                // Remove the preset and retry
                const retryFormData = new FormData();
                retryFormData.append('file', file);

                if (options.folder) {
                    retryFormData.append('folder', options.folder);
                }

                if (options.tags && options.tags.length > 0) {
                    retryFormData.append('tags', options.tags.join(','));
                }

                if (options.public_id) {
                    retryFormData.append('public_id', options.public_id);
                }

                const retryResponse = await fetch(
                    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
                    {
                        method: 'POST',
                        body: retryFormData,
                    }
                );

                if (!retryResponse.ok) {
                    const retryErrorData = await retryResponse.json();
                    throw new Error(`Cloudinary upload failed: ${retryErrorData.error?.message || 'Unknown error'}`);
                }

                const retryResult: CloudinaryUploadResult = await retryResponse.json();
                return retryResult;
            }

            throw new Error(`Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`);
        }

        const result: CloudinaryUploadResult = await response.json();
        return result;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
};

// Upload multiple images to Cloudinary
export const uploadMultipleToCloudinary = async (
    files: File[],
    options: UploadOptions = {}
): Promise<{ successes: CloudinaryUploadResult[]; failures: { file: string; error: string }[] }> => {
    const results = await Promise.allSettled(
        files.map(async (file) => {
            try {
                const result = await uploadToCloudinary(file, options);
                return { success: true, result, fileName: file.name };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    fileName: file.name
                };
            }
        })
    );

    const successes: CloudinaryUploadResult[] = [];
    const failures: { file: string; error: string }[] = [];

    results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
            successes.push(result.value.result!);
        } else if (result.status === 'fulfilled' && !result.value.success) {
            failures.push({
                file: result.value.fileName,
                error: result.value.error!
            });
        } else if (result.status === 'rejected') {
            failures.push({
                file: 'Unknown file',
                error: result.reason?.message || 'Upload failed'
            });
        }
    });

    return { successes, failures };
};

// Generate basic Cloudinary URL
export const getCloudinaryUrl = (publicId: string): string => {
    const config = getCloudinaryConfig();
    return `https://res.cloudinary.com/${config.cloudName}/image/upload/${publicId}`;
};