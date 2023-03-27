const express = require('express')
const adminC = require('../controllers/admin')
const isLogged = require('../middlewares/admin-is-auth')

const router = express.Router()

// TODO! DEV MODE: DO NOT FORGET TO ADD AUTH

router.post('/', adminC.login)

router.get('/products', adminC.showProducts)
router.get('/products/:id', adminC.showOneProduct)
router.post('/products', adminC.addProduct)
router.delete('/products/:id', adminC.deleteProduct)
router.patch('/products', adminC.updateProduct)

router.post('/categories', adminC.addCategory)
router.get('/categories', adminC.showCategories)
router.get('/categories/:id', adminC.showOneCategory)
router.delete('/categories/:id', adminC.deleteCategory)
router.patch('/categories', adminC.updateProduct)

module.exports = router