import { DragEvent, ChangeEvent } from 'react';

interface ImageHandlerProps {
    setImage: (file: File | null) => void;
    setPreview: (preview: string | null) => void;
    setLoading: (loading: boolean) => void;
    onNotification: (message: string | null) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
}

export const createImageHandlers = ({
    setImage,
    setPreview,
    setLoading,
    onNotification,
    fileInputRef
}: ImageHandlerProps) => {
    const handleDrag = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === "dragenter" || e.type === "dragover") {
            return true;
        } else if (e.type === "dragleave") {
            return false;
        }
        return false;
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleClick = (preview: string | null) => {
        // Only open file dialog if there's no preview image
        if (!preview) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file: File) => {
        setLoading(true);
        setImage(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target && typeof e.target.result === 'string') {
                setPreview(e.target.result);
            }
            setLoading(false);
        };
        reader.onerror = () => {
            setLoading(false);
            onNotification('Failed to process the image. Please try again.');
        };
        reader.readAsDataURL(file);
    };

    const clearImage = (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        setImage(null);
        setPreview(null);
        setLoading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return {
        handleDrag,
        handleDrop,
        handleClick,
        handleFileChange,
        handleFile,
        clearImage
    };
}; 