const categoryService =
  require('../services/categoryService');

/* =========================================================
   ADMIN LIST
========================================================= */

async function list(req, res) {
  res.json(
    await categoryService.list(req)
  );
}

/* =========================================================
   ADMIN DETAILS
========================================================= */

async function getById(req, res) {
  res.json(
    await categoryService.getById(
      parseInt(req.params.id, 10)
    )
  );
}

/* =========================================================
   PUBLIC CATEGORY LIST
========================================================= */

async function publicList(req, res) {
  res.json(
    await categoryService.list(req)
  );
}

/* =========================================================
   PUBLIC CATEGORY DETAILS
========================================================= */

async function publicGetById(
  req,
  res
) {
  res.json(
    await categoryService.getById(
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
  res
    .status(201)
    .json(
      await categoryService.create(
        req.body || {}
      )
    );
}

/* =========================================================
   ADMIN UPDATE
========================================================= */

async function update(req, res) {
  res.json(
    await categoryService.update(
      parseInt(req.params.id, 10),
      req.body || {}
    )
  );
}

/* =========================================================
   ADMIN DELETE
========================================================= */

async function remove(req, res) {
  res.json(
    await categoryService.remove(
      parseInt(req.params.id, 10)
    )
  );
}

/* =========================================================
   ADMIN ASSIGN PRODUCTS
========================================================= */

async function assignProducts(
  req,
  res
) {
  const raw =
    req.body?.action ||
    'add';

  const action =
    raw === 'remove' ||
    raw === 'unassign'
      ? 'remove'
      : 'add';

  res.json(
    await categoryService.assignProducts(
      parseInt(req.params.id, 10),

      req.body?.product_ids || [],

      action
    )
  );
}

module.exports = {
  list,
  getById,

  publicList,
  publicGetById,

  create,
  update,
  remove,
  assignProducts,
};


// const categoryService = require('../services/categoryService');

// async function list(req, res) {
//   res.json(await categoryService.list(req));
// }
// async function getById(req, res) {
//   res.json(await categoryService.getById(parseInt(req.params.id, 10)));
// }
// async function create(req, res) {
//   res.status(201).json(await categoryService.create(req.body || {}));
// }
// async function update(req, res) {
//   res.json(await categoryService.update(parseInt(req.params.id, 10), req.body || {}));
// }
// async function remove(req, res) {
//   res.json(await categoryService.remove(parseInt(req.params.id, 10)));
// }
// async function assignProducts(req, res) {
//   const raw = req.body?.action || 'add';
//   const action = raw === 'remove' || raw === 'unassign' ? 'remove' : 'add';
//   res.json(
//     await categoryService.assignProducts(
//       parseInt(req.params.id, 10),
//       req.body?.product_ids || [],
//       action
//     )
//   );
// }

// module.exports = { list, getById, create, update, remove, assignProducts };
