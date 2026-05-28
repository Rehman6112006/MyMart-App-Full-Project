const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authenticate = require('../middleware/auth');

router.post('/', authenticate, cartController.addToCart);
router.get('/', authenticate, cartController.getCart);
router.put('/:id', authenticate, cartController.updateCartItem);
router.delete('/:id', authenticate, cartController.removeFromCart);
router.delete('/', authenticate, cartController.clearCart);

module.exports = router;
