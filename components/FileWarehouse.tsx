
import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, X, Database, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { StoredDocument } from '../types';
import { uploadDocument, listDocuments, saveLocalDocuments } from '../services/documentStore';

interface FileWarehouseProps {
  onClose: () => void;
  onUpdateDocuments: (docs: StoredDocument[]) => void;
}

const FileWarehouse: React.FC<FileWarehouseProps> = ({ onClose, onUpdateDocuments }) => {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const docs = await listDocuments();
    setDocuments(docs);
    onUpdateDocuments(docs);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const newDocs: StoredDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const doc = await uploadDocument(file);
      if (doc) newDocs.push(doc);
    }

    const updated = [...newDocs, ...documents];
    setDocuments(updated);
    saveLocalDocuments(updated);
    onUpdateDocuments(updated);
    setIsUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = (id: string) => {
    const updated = documents.filter(d => d.id !== id);
    setDocuments(updated);
    saveLocalDocuments(updated);
    onUpdateDocuments(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b1120] border border-gray-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-gray-400" />
            <h2 className="text-sm font-bold text-gray-200">経営資料室</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Upload Area */}
        <div 
          className={`p-6 border-b border-gray-800 transition-colors ${dragActive ? 'bg-gray-800 border-gray-600' : 'bg-transparent'}`}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={handleDrop}
        >
          <div className="border border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-800/50"
               onClick={() => fileInputRef.current?.click()}>
            <input 
              ref={fileInputRef} 
              type="file" 
              multiple 
              className="hidden" 
              accept=".pdf,.doc,.docx,.txt,.csv"
              onChange={(e) => handleFiles(e.target.files)} 
            />
            {isUploading ? (
              <Loader2 size={24} className="text-gray-400 animate-spin mb-2" />
            ) : (
              <Upload size={24} className="text-gray-500 mb-2" />
            )}
            <p className="text-gray-300 text-sm font-medium mb-1">
              {isUploading ? "アップロード中..." : "ファイルを選択"}
            </p>
            <p className="text-[10px] text-gray-500">
              PDF, Word, Excel, Text
            </p>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-3 bg-[#0f172a]">
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p className="text-xs">資料がありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-900 border border-gray-800 rounded hover:border-gray-600 transition-colors">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText size={14} className="text-gray-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-200 truncate">{doc.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileWarehouse;
