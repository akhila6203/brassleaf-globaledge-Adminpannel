const express =
  require("express");

const router =
  express.Router();

const ctrl =
  require(
    "../controllers/customerAuthController"
  );

const asyncHandler =
  require(
    "../middleware/asyncHandler"
  );

const {
  authenticate,
  requireCustomer,
} =
  require(
    "../middleware/auth"
  );

/* ===============================
   PUBLIC CUSTOMER AUTH
================================ */

router.post(
  "/register",
  asyncHandler(
    ctrl.register
  )
);

router.post(
  "/login",
  asyncHandler(
    ctrl.login
  )
);

router.post(
  "/forgot-password",
  asyncHandler(
    ctrl.forgotPassword
  )
);

router.post(
  "/set-password",
  asyncHandler(
    ctrl.setPassword
  )
);

/*
 * Checkout checks whether
 * entered email already exists.
 */
router.post(
  "/check-email",
  asyncHandler(
    ctrl.checkEmail
  )
);

/*
 * New guest checkout:
 * create account using password
 * entered on checkout page
 * and login immediately.
 */
router.post(
  "/checkout-register",
  asyncHandler(
    ctrl.checkoutRegister
  )
);

/* ===============================
   LOGOUT
================================ */

router.post(
  "/logout",
  asyncHandler(
    ctrl.logout
  )
);

/* ===============================
   LOGGED-IN CUSTOMER
================================ */

router.get(
  "/me",
  authenticate,
  requireCustomer,
  asyncHandler(
    ctrl.me
  )
);

router.put(
  "/me",
  authenticate,
  requireCustomer,
  asyncHandler(
    ctrl.updateMe
  )
);

router.put(
  "/change-password",
  authenticate,
  requireCustomer,
  asyncHandler(
    ctrl.changePassword
  )
);

router.get(
  "/cart",
  authenticate,
  requireCustomer,
  asyncHandler(
    ctrl.getCart
  )
);

router.put(
  "/cart",
  authenticate,
  requireCustomer,
  asyncHandler(
    ctrl.saveCart
  )
);

router.delete(
  "/cart",
  authenticate,
  requireCustomer,
  asyncHandler(
    ctrl.clearCart
  )
);

module.exports =
  router;
  
  
  // const express =
//   require("express");

// const router =
//   express.Router();

// const asyncHandler =
//   require("../middleware/asyncHandler");

// const ctrl =
//   require("../controllers/customerAuthController");

// const {
//   authenticate,
//   requireCustomer,
// } =
//   require("../middleware/auth");

// /* =========================================
//    PUBLIC AUTH
// ========================================= */

// router.post(
//   "/register",
//   asyncHandler(
//     ctrl.register
//   )
// );

// router.post(
//   "/login",
//   asyncHandler(
//     ctrl.login
//   )
// );

// router.post(
//   "/forgot-password",
//   asyncHandler(
//     ctrl.forgotPassword
//   )
// );

// router.post(
//   "/set-password",
//   asyncHandler(
//     ctrl.setPassword
//   )
// );

// /* =========================================
//    LOGGED-IN CUSTOMER ROUTES
// ========================================= */

// router.get(
//   "/me",
//   authenticate,
//   requireCustomer,
//   asyncHandler(
//     ctrl.me
//   )
// );

// router.post(
//   "/logout",
//   authenticate,
//   requireCustomer,
//   asyncHandler(
//     ctrl.logout
//   )
// );

// router.put(
//   "/change-password",
//   authenticate,
//   requireCustomer,
//   asyncHandler(
//     ctrl.changePassword
//   )
// );

// /* =========================================
//    CUSTOMER CART
// ========================================= */

// router.get(
//   "/cart",
//   authenticate,
//   requireCustomer,
//   asyncHandler(
//     ctrl.getCart
//   )
// );

// router.put(
//   "/cart",
//   authenticate,
//   requireCustomer,
//   asyncHandler(
//     ctrl.saveCart
//   )
// );

// router.delete(
//   "/cart",
//   authenticate,
//   requireCustomer,
//   asyncHandler(
//     ctrl.clearCart
//   )
// );

// module.exports =
//   router;