import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

const OrderedProductsModal = ({ isVisible, onClose, products }) => {
  if (!isVisible) return null;

  const productList = products.split(', ').map(item => {
    const [name, quantity] = item.split(' (');
    return { name, quantity: quantity.replace(')', '') };
  });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Ordered Products</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <FaTimes />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {productList.map((product, index) => (
                <div key={index} className="mb-2 pb-2 border-b border-gray-200 last:border-b-0">
                  <p className="font-semibold text-gray-700">{product.name}</p>
                  <p className="text-sm text-gray-600">Quantity: {product.quantity}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrderedProductsModal;