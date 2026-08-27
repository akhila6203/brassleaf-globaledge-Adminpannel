const mediaService = require('../services/mediaService');

async function list(req, res) {
  res.json(await mediaService.list(req));
}
async function getById(req, res) {
  res.json(await mediaService.getById(parseInt(req.params.id, 10)));
}
async function upload(req, res) {
  const media = await mediaService.createFromUpload(req.file, {
    authorId: req.user?.id || 1,
    parentId: req.body?.parent_id ? parseInt(req.body.parent_id, 10) : 0,
    title: req.body?.title,
  });
  res.status(201).json(media);
}
async function remove(req, res) {
  res.json(
    await mediaService.remove(parseInt(req.params.id, 10), {
      force: req.query.force === '1' || req.query.force === 'true',
    })
  );
}
async function setFeatured(req, res) {
  res.json(
    await mediaService.setProductFeatured(
      parseInt(req.params.productId, 10),
      parseInt(req.body?.attachment_id, 10)
    )
  );
}
async function setGallery(req, res) {
  res.json(
    await mediaService.setProductGallery(
      parseInt(req.params.productId, 10),
      req.body?.attachment_ids || []
    )
  );
}

module.exports = { list, getById, upload, remove, setFeatured, setGallery };
