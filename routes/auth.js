const express = require('express')
const customerC = require('../controllers/customer')

const router = express.Router()


router.post("/registrering", customerC.signUp)
router.post("/login", customerC.login)
router.delete("/logout/:id", customerC.logout)

module.exports = router