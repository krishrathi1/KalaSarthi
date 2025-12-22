/**
 * Utility functions for formatting data
 * Enhanced with better localization support
 */

/**
 * Format price with Indian Rupee symbol
 */
export function formatPrice(price: number): string {
    if (typeof price !== 'number' || isNaN(price)) {
        return '\u20B90';
    }
    // Format the number part
    const formatted = new Intl.NumberFormat("en-IN", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(price);
    // Use explicit Unicode for rupee symbol
    return `\u20B9${formatted}`;
}


/**
 * Format date in a readable format
 */
export function formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(dateObj);
}

export const formatPriceWithDecimals = (amount: number): string => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '₹0.00';
    }

    const formattedNumber = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
    return `₹${formattedNumber}`;
};

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(dateObj);
}



/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    return formatDate(dateObj);
}

export const formatNumber = (num: number): string => {
    if (typeof num !== 'number' || isNaN(num)) {
        return '0';
    }

    return new Intl.NumberFormat('en-IN').format(num);
};

// Format number in compact notation (e.g., 1.2K, 3.4M)
export const formatNumberCompact = (num: number): string => {
    if (typeof num !== 'number' || isNaN(num)) {
        return '0';
    }

    return new Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(num);
};

/**
 * Format file size in bytes to human readable format
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
    if (typeof value !== 'number' || isNaN(value)) {
        return '0%';
    }

    return `${value.toFixed(decimals)}%`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (!text || text.length <= maxLength) {
        return text || '';
    }

    return text.slice(0, maxLength).trim() + '...';
};

/**
 * Format phone number (Indian format)
 */
export const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Format as +91 XXXXX XXXXX for Indian numbers
    if (cleaned.length === 10) {
        return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }

    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }

    return phone; // Return original if can't format
};

/**
 * Format address for display
 */
export const formatAddress = (address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
}): string => {
    const parts = [
        address.street,
        address.city,
        address.state,
        address.zipCode,
        address.country
    ].filter(Boolean);

    return parts.join(', ');
};

/**
 * Format order status for display
 */
export const formatOrderStatus = (status: string): string => {
    return status.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
};

/**
 * Get color class for order status
 */
export const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
        case 'pending':
            return 'text-yellow-600 bg-yellow-50';
        case 'confirmed':
            return 'text-blue-600 bg-blue-50';
        case 'processing':
            return 'text-blue-600 bg-blue-50';
        case 'shipped':
            return 'text-green-600 bg-green-50';
        case 'delivered':
            return 'text-green-600 bg-green-50';
        case 'cancelled':
            return 'text-red-600 bg-red-50';
        case 'refunded':
            return 'text-red-600 bg-red-50';
        default:
            return 'text-gray-600 bg-gray-50';
    }
};
