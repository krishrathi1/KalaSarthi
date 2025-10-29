/**
 * Camera Capture - Mobile camera integration for document capture
 * Supports photo capture, video recording, and image optimization
 */

export interface CaptureOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
  quality?: number;
}

export interface CapturedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
}

export class CameraCapture {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      return false;
    }
  }

  async startCamera(options: CaptureOptions = {}): Promise<MediaStream> {
    const {
      facingMode = 'environment',
      width = 1920,
      height = 1080
    } = options;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: width },
          height: { ideal: height }
        }
      });

      return this.stream;
    } catch (error) {
      console.error('Failed to start camera:', error);
      throw new Error('Camera access denied or not available');
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  async capturePhoto(options: CaptureOptions = {}): Promise<CapturedImage> {
    if (!this.stream) {
      throw new Error('Camera not started');
    }

    const { quality = 0.92 } = options;

    // Create video element if not exists
    if (!this.videoElement) {
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.play();
    }

    // Wait for video to be ready
    await new Promise(resolve => {
      if (this.videoElement!.readyState >= 2) {
        resolve(null);
      } else {
        this.videoElement!.addEventListener('loadeddata', () => resolve(null), { once: true });
      }
    });

    // Create canvas and capture frame
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(this.videoElement, 0, 0);

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        quality
      );
    });

    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    return {
      blob,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      size: blob.size
    };
  }

  async captureFromFile(file: File, options: CaptureOptions = {}): Promise<CapturedImage> {
    const { quality = 0.92, width: maxWidth, height: maxHeight } = options;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Resize if needed
          if (maxWidth && width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (maxHeight && height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve({
                  blob,
                  dataUrl,
                  width,
                  height,
                  size: blob.size
                });
              } else {
                reject(new Error('Failed to create blob'));
              }
            },
            'image/jpeg',
            quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  switchCamera() {
    // Toggle between front and back camera
    if (this.stream) {
      const videoTrack = this.stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      const currentFacingMode = settings.facingMode;
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

      this.stopCamera();
      return this.startCamera({ facingMode: newFacingMode });
    }
    return Promise.reject(new Error('No active camera stream'));
  }

  async getSupportedConstraints(): Promise<MediaTrackSupportedConstraints> {
    return navigator.mediaDevices.getSupportedConstraints();
  }

  isCameraAvailable(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}

export const cameraCapture = new CameraCapture();
