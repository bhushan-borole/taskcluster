class Backend {
  constructor({ backendId, db, monitor, rootUrl, config }) {
    this.backendId = backendId;
    this.db = db;
    this.monitor = monitor;
    this.rootUrl = rootUrl;

    this._matches = config.matches;
  }

  /* NOTE:
   * `object` arguments to these methods are rows from `db.fns.get_object` or
   * equivalent.
   */

  /**
   * Set up this backend.
   *
   * Subclasses should override this.
   */
  async setup() {
  }

  /**
   * Get the set of download methods available for this object
   *
   * Subclasses should override this.
   */
  async availableDownloadMethods(object) {
    return [];
  }

  /**
   * Return the backend-specific details required for a client to retrieve the
   * object.  The result is returned directly from the `downloadObject` API
   * endpoint.  The given `method` is one of those returned from
   * `availableDownloadMethods`.
   *
   * Subclasses should override this.
   */
  async downloadObject(object, method) {
    throw new Error('downloadObject is not implemented for this backend');
  }

  /**
   * Expire an object.  This should delete any resources used by the object.
   * Return `true` to signal that the object's resources have been deleted and
   * the database row can be removed.  If resource removal takes more than a
   * few hundred milliseconds, this function should initiate that process and
   * return false, prepared to be called again for the same object at a later
   * time (such as by the next object-expiration crontask run).
   */
  async expireObject(object) {
    throw new Error('expiration is not implemented for this backend');
  }
}

module.exports = { Backend };