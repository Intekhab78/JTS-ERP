import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Trash2, UploadCloud, ImageIcon } from 'lucide-react';

const ImageManagerModal = ({ isOpen, onClose, product, refresh }) => {
  const [images, setImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setImages(product.images || []);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setLoading(true);
    setError('');

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('images', file);
    });

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:5000/api/v1/inventory/products/${product._id}/images`, 
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      setImages(res.data.images);
      setSelectedFiles([]);
      if (refresh) refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload images');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageUrl) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    setLoading(true);
    setError('');
    
    // Extract filename from URL
    const imageName = imageUrl.split('/').pop();

    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(
        `http://localhost:5000/api/v1/inventory/products/${product._id}/images/${imageName}`, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setImages(res.data.images);
      if (refresh) refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Images: ${product.name}`} size="lg">
      <div className="flex flex-col h-full max-h-[80vh]">
        {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}

        <div className="mb-6 p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center justify-center">
          <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-4 text-center">Select multiple images to upload for this product.</p>
          <div className="flex gap-2">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileChange} 
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
            />
            {selectedFiles.length > 0 && (
              <Button onClick={handleUpload} isLoading={loading} className="shrink-0">
                Upload {selectedFiles.length} File(s)
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <h3 className="font-semibold text-lg mb-3">Current Images</h3>
          {images.length === 0 ? (
            <div className="text-center py-12 text-gray-500 flex flex-col items-center">
              <ImageIcon className="h-12 w-12 text-gray-300 mb-2" />
              <p>No images uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm aspect-square bg-gray-100 flex items-center justify-center">
                  <img src={img} alt={`Product ${idx+1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => handleDeleteImage(img)} 
                      disabled={loading}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110"
                      title="Delete Image"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end shrink-0">
          <Button onClick={onClose} variant="outline">Done</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ImageManagerModal;
