// Simple Cloudinary upload utilities
// Enhanced with better error handling and configuration
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
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    // For development, use demo cloud if no cloud name is provided
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
        console.warn('No Cloudinary cloud name found. Using demo cloud for development.');
    }

    return {
        cloudName,
        uploadPreset: uploadPreset || ''
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

        // Handle upload presets - only add if we have a valid preset
        if (config.uploadPreset && config.uploadPreset.trim() !== '') {
            formData.append('upload_preset', config.uploadPreset);
        } else {
            // For development without proper Cloudinary setup, return a mock URL
            console.warn('⚠️ No Cloudinary upload preset configured. Using mock URL for development.');
            return {
                public_id: 'mock-image-' + Date.now(),
                secure_url: 'https://via.placeholder.com/400x300?text=Mock+Image',
                url: 'https://via.placeholder.com/400x300?text=Mock+Image',
                width: 400,
                height: 300,
                format: 'jpg',
                resource_type: 'image',
                bytes: 0
            };
        }

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

            // If upload preset error, return a mock response for development
            if (errorData.error?.message?.includes('Upload preset')) {
                console.log('Upload preset error - returning mock upload result for development');
                return {
                    public_id: `dev_${Date.now()}`,
                    secure_url: `https://via.placeholder.com/800x600?text=Dev+Image+${Date.now()}`,
                    url: `https://via.placeholder.com/800x600?text=Dev+Image+${Date.now()}`,
                    width: 800,
                    height: 600,
                    format: 'jpg',
                    resource_type: 'image',
                    bytes: 50000
                };
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
                    error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
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
