import FormField from '../common/FormField';
import { useTaxonomy } from '../../context/TaxonomyContext';

export default function TaxonomyFields({ scope, categoryId, areaId, tagIds = [], onChange, categoryRequired = false, areaRequired = false }) {
  const { categoriesFor, areas, tags } = useTaxonomy();
  const categories = categoriesFor(scope);
  const toggleTag = (id) => {
    const next = tagIds.includes(id) ? tagIds.filter((value) => value !== id) : [...tagIds, id];
    onChange('tagIds', next);
  };

  return (
    <>
      <div className="form-grid form-grid--2">
        <FormField label="Chuyên mục" required={categoryRequired}>
          <select value={categoryId || ''} onChange={(event) => onChange('primaryCategoryId', event.target.value || null)}>
            <option value="">Chọn chuyên mục</option>
            {categories.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
        </FormField>
        <FormField label="Khu vực" required={areaRequired}>
          <select value={areaId || ''} onChange={(event) => onChange('primaryAreaId', event.target.value || null)}>
            <option value="">Chọn khu vực</option>
            {areas.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Thẻ chủ đề">
        <div className="tag-selector">
          {tags.slice(0, 30).map((tag) => (
            <button type="button" key={tag._id} className={tagIds.includes(tag._id) ? 'is-active' : ''} onClick={() => toggleTag(tag._id)}>#{tag.name}</button>
          ))}
        </div>
      </FormField>
    </>
  );
}
