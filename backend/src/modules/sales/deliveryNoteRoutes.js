const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../core/middleware/authMiddleware');
const {
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNoteById,
  updateDeliveryNote,
  deleteDeliveryNote,
  generateFromOrder,
  markReady,
  dispatchDeliveryNote,
  deliverDeliveryNote,
  cancelDeliveryNote
} = require('./deliveryNoteController');

router.use(protect);

router.route('/')
  .post(authorize('CREATE_DELIVERY_NOTE'), createDeliveryNote)
  .get(authorize('VIEW_DELIVERY_NOTE'), getDeliveryNotes);

router.post('/from-order/:orderId', authorize('CREATE_DELIVERY_NOTE'), generateFromOrder);

router.route('/:id')
  .get(authorize('VIEW_DELIVERY_NOTE'), getDeliveryNoteById)
  .put(authorize('EDIT_DELIVERY_NOTE'), updateDeliveryNote)
  .delete(authorize('DELETE_DELIVERY_NOTE'), deleteDeliveryNote);

router.patch('/:id/ready', authorize('EDIT_DELIVERY_NOTE'), markReady);
router.patch('/:id/dispatch', authorize('DISPATCH_DELIVERY_NOTE'), dispatchDeliveryNote);
router.patch('/:id/deliver', authorize('DELIVER_DELIVERY_NOTE'), deliverDeliveryNote);
router.patch('/:id/cancel', authorize('CANCEL_DELIVERY_NOTE'), cancelDeliveryNote);

module.exports = router;
