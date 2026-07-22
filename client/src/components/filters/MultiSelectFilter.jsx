import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Check,
  ChevronDown,
  Search,
  X,
} from 'lucide-react';

import './MultiSelectFilter.css';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function MultiSelectFilter({
  label,
  placeholder = 'Chọn giá trị',
  icon: Icon,
  options = [],
  selectedValues = [],
  onChange,
  searchable = true,
  disabled = false,
}) {
  const rootRef = useRef(null);

  const [open, setOpen] =
    useState(false);

  const [query, setQuery] =
    useState('');

  const selectedSet = useMemo(
    () =>
      new Set(
        selectedValues.map(String),
      ),
    [selectedValues],
  );

  const selectedOptions =
    useMemo(
      () =>
        options.filter((option) =>
          selectedSet.has(
            String(option.value),
          ),
        ),
      [options, selectedSet],
    );

  const filteredOptions =
    useMemo(() => {
      const cleanQuery =
        normalizeText(query);

      if (!cleanQuery) {
        return options;
      }

      return options.filter(
        (option) =>
          normalizeText(
            [
              option.label,
              option.searchText,
            ]
              .filter(Boolean)
              .join(' '),
          ).includes(cleanQuery),
      );
    }, [options, query]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const closeOutside = (
      event,
    ) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target,
        )
      ) {
        setOpen(false);
      }
    };

    const closeWithEscape = (
      event,
    ) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      closeOutside,
    );

    document.addEventListener(
      'keydown',
      closeWithEscape,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        closeOutside,
      );

      document.removeEventListener(
        'keydown',
        closeWithEscape,
      );
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const toggleValue = (value) => {
    const normalizedValue =
      String(value);

    const exists =
      selectedSet.has(
        normalizedValue,
      );

    const nextValues = exists
      ? selectedValues.filter(
          (item) =>
            String(item) !==
            normalizedValue,
        )
      : [
          ...selectedValues,
          value,
        ];

    onChange(nextValues);
  };

  const selectAllVisible = () => {
    const nextValues =
      Array.from(
        new Set([
          ...selectedValues.map(
            String,
          ),
          ...filteredOptions.map(
            (option) =>
              String(option.value),
          ),
        ]),
      );

    onChange(nextValues);
  };

  const clear = () => {
    onChange([]);
  };

  const summary = useMemo(() => {
    if (!selectedOptions.length) {
      return placeholder;
    }

    if (
      selectedOptions.length === 1
    ) {
      return selectedOptions[0].label;
    }

    return `${selectedOptions.length} mục đã chọn`;
  }, [
    selectedOptions,
    placeholder,
  ]);

  const allVisibleSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every(
      (option) =>
        selectedSet.has(
          String(option.value),
        ),
    );

  return (
    <div
      ref={rootRef}
      className={[
        'multi-select-filter',
        open ? 'is-open' : '',
        disabled ? 'is-disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="multi-select-filter__label">
        {label}
      </span>

      <button
        type="button"
        className="multi-select-filter__trigger"
        aria-expanded={open}
        disabled={disabled}
        onClick={() =>
          setOpen(
            (current) => !current,
          )
        }
      >
        {Icon ? (
          <Icon size={18} />
        ) : null}

        <span
          className={
            selectedOptions.length
              ? 'has-value'
              : ''
          }
        >
          {summary}
        </span>

        {selectedOptions.length ? (
          <small>
            {selectedOptions.length}
          </small>
        ) : null}

        <ChevronDown
          size={17}
          className={
            open ? 'is-open' : ''
          }
        />
      </button>

      {open ? (
        <div className="multi-select-filter__panel">
          <div className="multi-select-filter__panel-header">
            <div>
              <strong>{label}</strong>

              <span>
                Chọn một hoặc nhiều mục
              </span>
            </div>

            <button
              type="button"
              aria-label="Đóng"
              onClick={() =>
                setOpen(false)
              }
            >
              <X size={18} />
            </button>
          </div>

          {searchable ? (
            <label className="multi-select-filter__search">
              <Search size={16} />

              <input
                type="search"
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
                placeholder={`Tìm ${label.toLowerCase()}...`}
              />

              {query ? (
                <button
                  type="button"
                  aria-label="Xóa tìm kiếm"
                  onClick={() =>
                    setQuery('')
                  }
                >
                  <X size={15} />
                </button>
              ) : null}
            </label>
          ) : null}

          <div className="multi-select-filter__tools">
            <button
              type="button"
              onClick={
                allVisibleSelected
                  ? clear
                  : selectAllVisible
              }
            >
              {allVisibleSelected
                ? 'Bỏ chọn tất cả'
                : 'Chọn tất cả'}
            </button>

            {selectedValues.length ? (
              <button
                type="button"
                onClick={clear}
              >
                Xóa lựa chọn
              </button>
            ) : null}
          </div>

          <div className="multi-select-filter__options">
            {filteredOptions.length ? (
              filteredOptions.map(
                (option) => {
                  const selected =
                    selectedSet.has(
                      String(
                        option.value,
                      ),
                    );

                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={
                        selected
                          ? 'is-selected'
                          : ''
                      }
                      onClick={() =>
                        toggleValue(
                          option.value,
                        )
                      }
                    >
                      <span className="multi-select-filter__checkbox">
                        {selected ? (
                          <Check
                            size={15}
                          />
                        ) : null}
                      </span>

                      <span className="multi-select-filter__option-label">
                        {option.label}
                      </span>
                    </button>
                  );
                },
              )
            ) : (
              <div className="multi-select-filter__empty">
                Không tìm thấy kết quả
              </div>
            )}
          </div>

          <div className="multi-select-filter__footer">
            <span>
              Đã chọn{' '}
              <strong>
                {selectedValues.length}
              </strong>{' '}
              mục
            </span>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
            >
              Hoàn tất
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}