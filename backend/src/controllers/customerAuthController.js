const customerAuthService =
  require('../services/customerAuthService');


  function setCustomerCookie(
  res,
  token
) {
  const isProduction =
    process.env.NODE_ENV ===
    "production";

  res.cookie(
    "customer_token",
    token,
    {
      httpOnly: true,

      secure:
        isProduction,

      sameSite:
        isProduction
          ? "none"
          : "lax",

      maxAge:
        12 *
        60 *
        60 *
        1000,

      path: "/",
    }
  );
}

async function register(req, res) {
  const {
    firstName,
    lastName,
    email,
  } = req.body || {};

  const result =
    await customerAuthService.register({
      firstName,
      lastName,
      email,
    });

  res
    .status(201)
    .json(result);
}
async function login(
  req,
  res
) {
  const {
    email,
    password,
  } =
    req.body || {};

  const result =
    await customerAuthService
      .login({
        email,
        password,
      });

  setCustomerCookie(
    res,
    result.token
  );

  res.json({
    user:
      result.user,
  });
}
async function forgotPassword(
  req,
  res
) {
  const {
    email,
  } = req.body || {};

  const result =
    await customerAuthService
      .forgotPassword(email);

  res.json(result);
}
async function setPassword(
  req,
  res
) {
  const {
    token,
    password,
    confirmPassword,
  } = req.body || {};

  const result =
    await customerAuthService
      .setPassword({
        token,
        password,
        confirmPassword,
      });

  /*
   * IMPORTANT:
   * Set Password / Reset Password successful
   * ayyaka existing customer login session clear.
   *
   * Then /profile always shows Login screen.
   */
  res.clearCookie(
    "customer_token",
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite:
        process.env.NODE_ENV ===
        "production"
          ? "none"
          : "lax",

      path: "/",
    }
  );

  res.json(result);
}

async function checkEmail(
  req,
  res
) {
  const {
    email,
  } =
    req.body || {};

  const result =
    await customerAuthService
      .checkCustomerEmail(
        email
      );

  res.json(result);
}

async function checkoutRegister(
  req,
  res
) {
  const {
    firstName,
    lastName,
    email,
    password,
  } =
    req.body || {};

  const result =
    await customerAuthService
      .registerFromCheckout({
        firstName,
        lastName,
        email,
        password,
      });

  setCustomerCookie(
    res,
    result.token
  );

  res
    .status(201)
    .json({
      user:
        result.user,
    });
}

async function me(
  req,
  res
) {
  const result =
    await customerAuthService.getMe(
      req.user.id
    );

  res.json({
    user: result,
  });
}

async function updateMe(
  req,
  res
) {
  const user =
    await customerAuthService
      .updateMe(
        req.user.id,
        req.body || {}
      );

  res.json({
    user,
  });
}

async function logout(
  req,
  res
) {
  res.clearCookie(
    "customer_token",
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite:
        process.env.NODE_ENV ===
        "production"
          ? "none"
          : "lax",

      path: "/",
    }
  );

  res.json({
    ok: true,
    message:
      "Logged out successfully.",
  });
}

async function changePassword(
  req,
  res
) {
  const {
    currentPassword,
    newPassword,
    confirmPassword,
  } = req.body || {};

  const result =
    await customerAuthService
      .changePassword({
        userId:
          req.user.id,

        currentPassword,
        newPassword,
        confirmPassword,
      });

  res.json(result);
}

async function getCart(
  req,
  res
) {
  const result =
    await customerAuthService
      .getCart(
        req.user.id
      );

  res.json(result);
}

async function saveCart(
  req,
  res
) {
  const result =
    await customerAuthService
      .saveCart(
        req.user.id,
        req.body?.items
      );

  res.json(result);
}

async function clearCart(
  req,
  res
) {
  const result =
    await customerAuthService
      .clearCustomerCart(
        req.user.id
      );

  res.json(result);
}

// module.exports = {
//   register,
//   login,
//   forgotPassword,
//   setPassword,
// };
module.exports = {
  register,
  login,

  forgotPassword,
  setPassword,

  checkEmail,
  checkoutRegister,

  me,
  updateMe,
  logout,

  changePassword,

  getCart,
  saveCart,
  clearCart,
};


// const customerAuthService =
//   require('../services/customerAuthService');

// async function register(req, res) {
//   const {
//     firstName,
//     lastName,
//     email,
//   } = req.body || {};

//   const result =
//     await customerAuthService.register({
//       firstName,
//       lastName,
//       email,
//     });

//   res
//     .status(201)
//     .json(result);
// }

// async function login(req, res) {
//   const {
//     email,
//     password,
//   } = req.body || {};

//   const result =
//     await customerAuthService.login({
//       email,
//       password,
//     });

//   res.json(result);
// }

// async function forgotPassword(
//   req,
//   res
// ) {
//   const {
//     email,
//   } = req.body || {};

//   const result =
//     await customerAuthService
//       .forgotPassword(email);

//   res.json(result);
// }

// async function setPassword(
//   req,
//   res
// ) {
//   const {
//     token,
//     password,
//     confirmPassword,
//   } = req.body || {};

//   const result =
//     await customerAuthService
//       .setPassword({
//         token,
//         password,
//         confirmPassword,
//       });

//   res.json(result);
// }

// module.exports = {
//   register,
//   login,
//   forgotPassword,
//   setPassword,
// };