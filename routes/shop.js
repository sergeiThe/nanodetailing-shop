const express = require('express')
const shopC = require('../controllers/shop')

const router = express.Router()


router.get('/', shopC.getProducts)


module.exports = router