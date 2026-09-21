const DocumentType = require('../../core/models/DocumentType');

exports.getDocumentTypes = async (req, res) => {
  try {
    const documentTypes = await DocumentType.find({ tenantId: req.user.tenantId }).sort({ name: 1 });
    res.status(200).json(documentTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createDocumentType = async (req, res) => {
  try {
    const docType = await DocumentType.create({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...req.body
    });
    res.status(201).json(docType);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A Document Type with this code already exists.' });
    }
    res.status(400).json({ message: error.message });
  }
};

exports.updateDocumentType = async (req, res) => {
  try {
    const docType = await DocumentType.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { ...req.body, updatedBy: req.user.id },
      { returnDocument: 'after', runValidators: true }
    );
    if (!docType) {
      return res.status(404).json({ message: 'Document Type not found' });
    }
    res.status(200).json(docType);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A Document Type with this code already exists.' });
    }
    res.status(400).json({ message: error.message });
  }
};

exports.deleteDocumentType = async (req, res) => {
  try {
    const docType = await DocumentType.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!docType) {
      return res.status(404).json({ message: 'Document Type not found' });
    }
    res.status(200).json({ message: 'Document Type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
