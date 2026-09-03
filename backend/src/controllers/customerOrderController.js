const customerOrderService = require('../services/customerOrderService');
const paytmService = require('../services/paytmService');
const env = require('../config/env');

function customerRedirect(path) {
  const base =
    env.customerFrontendUrl ||
    env.frontendUrl ||
    'http://localhost:5173';
  return `${String(base).replace(/\/$/, '')}${path}`;
}

async function listOrders(req, res) {
  const orders = await customerOrderService.listOrdersForCustomer(req.user.id);
  res.json({ orders });
}

async function createOrder(req, res) {
  const order = await customerOrderService.createOrder(req.user.id, req.body || {}, {
    ip: req.ip,
    userAgent: req.headers['user-agent'] || '',
  });

  res.status(201).json({ order });
}

async function getOrder(req, res) {
  const order = await customerOrderService.getOrderForCustomer(
    req.user.id,
    req.params.id
  );
  res.json({ order });
}

async function cancelOrder(req, res) {
  const order = await customerOrderService.cancelOrder(
    req.user.id,
    req.params.id
  );
  res.json({ order, message: 'Order cancelled successfully.' });
}

async function verifyPayment(
  req,
  res
) {
  const payment =
    await paytmService.verifyOrderPayment(
      req.params.id,
      req.user.id,
      req.body &&
      req.body.paytmOrderId
    );

  res.json({
    payment,
  });
}

async function initiatePayment(req, res) {
  const payment = await paytmService.initiatePayment(
    req.params.id,
    req.user.id
  );
  res.json({ payment });
}

async function paytmCallback(req, res) {
  try {
    const result = await paytmService.handleCallback(req.body || {});

    if (result.success) {
      return res.redirect(
        customerRedirect(
          `/order-success?orderId=${encodeURIComponent(result.orderId)}`
        )
      );
    }

    return res.redirect(
      customerRedirect(
        `/pay-for-order/${encodeURIComponent(result.orderId)}?payment=failed`
      )
    );
  } catch (error) {
    console.error('[Paytm callback]', error);
    return res.redirect(customerRedirect('/profile?tab=orders'));
  }
}

async function paytmConfig(req, res) {
  const config = await paytmService.getPublicConfig();
  res.json(config);
}

// module.exports = {
//   listOrders,
//   createOrder,
//   getOrder,
//   cancelOrder,
//   initiatePayment,
//   paytmCallback,
//   paytmConfig,
// };
module.exports = {
  listOrders,
  createOrder,
  getOrder,
  cancelOrder,
  initiatePayment,
  verifyPayment,
  paytmCallback,
  paytmConfig,
};




// const customerOrderService = require('../services/customerOrderService');
// const paytmService = require('../services/paytmService');
// const env = require('../config/env');

// function customerRedirect(path) {
//   const base =
//     env.customerFrontendUrl ||
//     env.frontendUrl ||
//     'http://localhost:5173';
//   return `${String(base).replace(/\/$/, '')}${path}`;
// }

// async function listOrders(req, res) {
//   const orders = await customerOrderService.listOrdersForCustomer(req.user.id);
//   res.json({ orders });
// }

// async function createOrder(req, res) {
//   const order = await customerOrderService.createOrder(req.user.id, req.body || {}, {
//     ip: req.ip,
//     userAgent: req.headers['user-agent'] || '',
//   });

//   res.status(201).json({ order });
// }

// async function getOrder(req, res) {
//   const order = await customerOrderService.getOrderForCustomer(
//     req.user.id,
//     req.params.id
//   );
//   res.json({ order });
// }

// async function cancelOrder(req, res) {
//   const order = await customerOrderService.cancelOrder(
//     req.user.id,
//     req.params.id
//   );
//   res.json({ order, message: 'Order cancelled successfully.' });
// }

// async function initiatePayment(req, res) {
//   const payment = await paytmService.initiatePayment(
//     req.params.id,
//     req.user.id
//   );
//   res.json({ payment });
// }

// async function paytmCallback(req, res) {
//   try {
//     const result = await paytmService.handleCallback(req.body || {});

//     if (result.success) {
//       return res.redirect(
//         customerRedirect(
//           `/order-success?orderId=${encodeURIComponent(result.orderId)}`
//         )
//       );
//     }

//     return res.redirect(
//       customerRedirect(
//         `/pay-for-order/${encodeURIComponent(result.orderId)}?payment=failed`
//       )
//     );
//   } catch (error) {
//     console.error('[Paytm callback]', error);
//     return res.redirect(customerRedirect('/profile?tab=orders'));
//   }
// }

// async function paytmConfig(req, res) {
//   const config = await paytmService.getPublicConfig();
//   res.json(config);
// }

// module.exports = {
//   listOrders,
//   createOrder,
//   getOrder,
//   cancelOrder,
//   initiatePayment,
//   paytmCallback,
//   paytmConfig,
// };
