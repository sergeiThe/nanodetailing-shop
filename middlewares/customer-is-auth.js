const jwt = require('jsonwebtoken')
const ApiError = require('../error/api-error')

module.exports = (req, res, next) => {

    const token = req.get('Authorization').split(' ')[1]

    let decoded

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)

    } catch (err) {
        return ApiError.internal("Could not verify")
    }


    req.id = decoded.userId
    req.email = decoded.userEmail

    next()
}