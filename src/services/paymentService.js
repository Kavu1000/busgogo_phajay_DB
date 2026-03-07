const axios = require('axios');

// const LAPNET_API_URL = 'https://payment-gateway.phajay.co/v1/api/test/payment/get-payment-link';
const LAPNET_API_URL = 'https://payment-gateway.phajay.co/v1/api/link/payment-link';

/**
 * Generate a payment link using LAPNet API
 * @param {string} orderNo - Unique order/booking ID
 * @param {number} amount - Payment amount in LAK
 * @param {string} description - Payment description
 * @param {string} tag1 - Custom tag (e.g., app name)
 * @param {string} tag2 - Custom tag (e.g., user ID)
 * @param {string} successCallbackUrl - URL to redirect after successful payment
 * @returns {Promise<{message: string, redirectURL: string}>}
 */
const generatePaymentLink = async (orderNo, amount, description, tag1 = 'BusGoGo', tag2 = '', successCallbackUrl = '') => {
    try {
        const apiKey = process.env.PHAPAY_API_KEY || process.env.PHAJAY_API_KEY;

        if (!apiKey) {
            throw new Error('PHAPAY_API_KEY or PHAJAY_API_KEY is not configured');
        }

        // Create Basic Auth header
        const authHeader = `Basic ${Buffer.from(apiKey).toString('base64')}`;

        const requestBody = {
            orderNo,
            amount: 1, // Temporary test value under 1000 limit for non-KYC accounts
            description,
            tag1,
            tag2
        };

        // Add callback URL if provided. Trying various parameter names commonly used by payment gateways.
        if (successCallbackUrl) {
            requestBody.successCallbackUrl = successCallbackUrl;
            requestBody.redirectURL = successCallbackUrl;
            requestBody.redirectUrl = successCallbackUrl;
            requestBody.callbackUrl = successCallbackUrl;
            requestBody.returnUrl = successCallbackUrl;
        }

        const response = await axios.post(
            LAPNET_API_URL,
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('LAPNet payment link generation failed:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to generate payment link');
    }
};

module.exports = {
    generatePaymentLink
};
