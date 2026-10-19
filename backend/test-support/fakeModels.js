// Minimal in-memory stand-ins for the Mongoose models, so access-control
// logic can be tested without a database. Supports only what the code uses:
// equality filters, sort/limit, save, findOne/findById/findByIdAndDelete.
function makeModel(name, defaults = () => ({}), uniqueOn = []) {
  let store = [];
  let seq = 0;

  const query = (rows) => ({
    sort(spec) {
      const [k, dir] = Object.entries(spec)[0];
      const val = (d) => (d[k] instanceof Date ? d[k].getTime() : d[k]);
      rows = [...rows].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * dir);
      return this;
    },
    limit(n) {
      rows = rows.slice(0, n);
      return this;
    },
    then(res, rej) {
      return Promise.resolve(rows).then(res, rej);
    }
  });

  class Model {
    constructor(doc = {}) {
      Object.assign(this, defaults(), doc);
      if (!this._id) this._id = `${name}-${++seq}`;
    }
    async save() {
      const i = store.indexOf(this);
      if (i === -1) {
        for (const keys of uniqueOn) {
          if (keys.some((k) => this[k] === undefined || this[k] === null)) continue; // sparse: unset values never clash
          if (store.some((d) => keys.every((k) => d[k] === this[k]))) {
            const err = new Error("E11000 duplicate key");
            err.code = 11000;
            err.keyPattern = Object.fromEntries(keys.map((k) => [k, 1]));
            throw err;
          }
        }
        store.push(this);
      }
      return this;
    }
    static find(filter) {
      return query(store.filter((d) => Model._match(d, filter)));
    }
    static async findOne(filter) {
      return store.find((d) => Model._match(d, filter)) || null;
    }
    static async findById(id) {
      return store.find((d) => d._id === id) || null;
    }
    static async findByIdAndDelete(id) {
      store = store.filter((d) => d._id !== id);
    }
    static _match(doc, filter = {}) {
      return Object.entries(filter).every(([k, v]) => doc[k] === v);
    }
    static _reset() {
      store = [];
      seq = 0;
    }
  }
  return Model;
}

const now = () => new Date();

module.exports = {
  Patient: makeModel("Patient", () => ({}), [["aadhaar_id"], ["registrationNumber"]]),
  Doctor: makeModel("Doctor"),
  User: makeModel("User"),
  Treatment: makeModel("Treatment", () => ({ date: now(), hospital: "", doctorRegId: "", doctorName: "", source: "patient" })),
  LabResult: makeModel("LabResult", () => ({
    hospital: "", doctorRegId: "", doctorName: "", source: "patient", status: "normal", refLow: null, refHigh: null
  })),
  Consent: makeModel("Consent", () => ({ status: "pending", requestedAt: now(), respondedAt: null }), [["patientAadhaar", "doctorRegId"]]),
  AccessLog: makeModel("AccessLog", () => ({ at: now() })),
  Hospital: makeModel("Hospital", () => ({}), [["nameKey"]])
};
