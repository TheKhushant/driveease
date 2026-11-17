import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildSort, escapeRegex, getPagination, isObjectId, paginated, toBool } from '../utils/query.js';

const PROTECTED = ['_id', 'id', 'createdAt', 'updatedAt', '__v', 'key'];

const stripProtected = (body = {}) => {
  const out = { ...body };
  PROTECTED.forEach((k) => delete out[k]);
  return out;
};

/**
 * Generic REST controller for admin-managed resources.
 *
 * options.filters: { queryParam: 'bool' | 'id' | 'string' | ((value) => mongoFilter) }
 * Hooks receive (data|doc, req) and may throw ApiError.
 */
export function crudController(Model, options = {}) {
  const {
    searchFields = [],
    filters = {},
    sortable = ['createdAt', 'updatedAt'],
    defaultSort = { createdAt: -1 },
    populate,
    label = Model.modelName,
    beforeSave,
    afterSave,
    beforeDelete,
    afterDelete,
  } = options;

  const buildFilter = (query) => {
    const filter = {};
    for (const [param, type] of Object.entries(filters)) {
      const value = query[param];
      if (value === undefined || value === '') continue;
      if (typeof type === 'function') Object.assign(filter, type(value));
      else if (type === 'bool') filter[param] = toBool(value);
      else if (type === 'id') {
        if (!isObjectId(value)) throw ApiError.badRequest(`Invalid ${param}`);
        filter[param] = value;
      } else filter[param] = String(value);
    }
    if (query.search && searchFields.length) {
      const rx = new RegExp(escapeRegex(String(query.search).slice(0, 100)), 'i');
      filter.$or = searchFields.map((f) => ({ [f]: rx }));
    }
    return filter;
  };

  const withPopulate = (q) => (populate ? q.populate(populate) : q);

  const list = asyncHandler(async (req, res) => {
    const filter = buildFilter(req.query);
    const sort = buildSort(req.query.sort, sortable, defaultSort);
    if (toBool(req.query.all)) {
      const items = await withPopulate(Model.find(filter).sort(sort).limit(1000));
      return res.json({ success: true, data: { items, pagination: { page: 1, limit: items.length, total: items.length, pages: 1 } } });
    }
    const pg = getPagination(req.query);
    const [items, total] = await Promise.all([
      withPopulate(Model.find(filter).sort(sort).skip(pg.skip).limit(pg.limit)),
      Model.countDocuments(filter),
    ]);
    return res.json({ success: true, data: paginated(items, total, pg) });
  });

  const getOne = asyncHandler(async (req, res) => {
    const doc = await withPopulate(Model.findById(req.params.id));
    if (!doc) throw ApiError.notFound(`${label} not found`);
    res.json({ success: true, data: doc });
  });

  const create = asyncHandler(async (req, res) => {
    const data = stripProtected(req.body);
    if (beforeSave) await beforeSave(data, req, null);
    const doc = new Model(data);
    await doc.save();
    if (afterSave) await afterSave(doc, req, null);
    const out = populate ? await Model.findById(doc._id).populate(populate) : doc;
    res.status(201).json({ success: true, message: `${label} created`, data: out });
  });

  const update = asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw ApiError.notFound(`${label} not found`);
    const before = doc.toObject();
    const data = stripProtected(req.body);
    if (beforeSave) await beforeSave(data, req, doc);
    doc.set(data);
    await doc.save();
    if (afterSave) await afterSave(doc, req, before);
    const out = populate ? await Model.findById(doc._id).populate(populate) : doc;
    res.json({ success: true, message: `${label} updated`, data: out });
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw ApiError.notFound(`${label} not found`);
    if (beforeDelete) await beforeDelete(doc, req);
    await doc.deleteOne();
    if (afterDelete) await afterDelete(doc, req);
    res.json({ success: true, message: `${label} deleted` });
  });

  return { list, getOne, create, update, remove };
}
