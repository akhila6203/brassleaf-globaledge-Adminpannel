const productService =
  require('../services/productService');

/* =========================================================
   ADMIN LIST
========================================================= */

async function list(req, res) {
  res.json(
    await productService.list(req)
  );
}

/* =========================================================
   ADMIN DETAILS
========================================================= */

async function getById(req, res) {
  res.json(
    await productService.getById(
      parseInt(req.params.id, 10)
    )
  );
}

/* =========================================================
   PUBLIC CUSTOMER LIST
========================================================= */

async function publicList(req, res) {
  res.json(
    await productService.list(
      req,
      {
        publicOnly: true,
      }
    )
  );
}

/* =========================================================
   PUBLIC CUSTOMER DETAILS
========================================================= */

async function publicGetById(req, res) {
  res.json(
    await productService.getById(
      parseInt(req.params.id, 10),
      {
        publicOnly: true,
      }
    )
  );
}

/* =========================================================
   ADMIN CREATE
========================================================= */

async function create(req, res) {
  const product =
    await productService.create(
      req.body || {},
      req.user?.id || 1
    );

  res
    .status(201)
    .json(product);
}

/* =========================================================
   ADMIN UPDATE
========================================================= */

async function update(req, res) {
  res.json(
    await productService.update(
      parseInt(req.params.id, 10),
      req.body || {}
    )
  );
}

/* =========================================================
   ADMIN VARIATION UPDATE
========================================================= */

async function updateVariation(req, res) {
  res.json(
    await productService.updateVariation(
      parseInt(req.params.id, 10),
      parseInt(req.params.vid, 10),
      req.body || {}
    )
  );
}

/* =========================================================
   ADMIN DELETE / TRASH
========================================================= */

async function remove(req, res) {
  res.json(
    await productService.trash(
      parseInt(req.params.id, 10)
    )
  );
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  list,
  getById,

  publicList,
  publicGetById,

  create,
  update,
  updateVariation,
  remove,
};



// const productService = require('../services/productService');

// async function list(req, res) {
//   res.json(await productService.list(req));
// }
// async function getById(req, res) {
//   res.json(await productService.getById(parseInt(req.params.id, 10)));
// }
// async function create(req, res) {
//   const product = await productService.create(req.body || {}, req.user?.id || 1);
//   res.status(201).json(product);
// }
// async function update(req, res) {
//   res.json(await productService.update(parseInt(req.params.id, 10), req.body || {}));
// }
// async function updateVariation(req, res) {
//   res.json(
//     await productService.updateVariation(
//       parseInt(req.params.id, 10),
//       parseInt(req.params.vid, 10),
//       req.body || {}
//     )
//   );
// }
// async function remove(req, res) {
//   res.json(await productService.trash(parseInt(req.params.id, 10)));
// }

// module.exports = { list, getById, create, update, updateVariation, remove };
