import { requestVuejx } from '@controller/vuejx'

export function vuejx(db, site, token) {
  const mappedQuery = {
    userUpdateById: `mutation UserUpdateById($collection: String, $body: JSON) {
      userUpdateById(collection: $collection, body: $body)
    }`,
    processDb: `customMapped`,
  }

  return {
    userUpdateById: async (collection, body) => {
      return await requestVuejx(mappedQuery.userUpdateById, {
        collection,
        body,
      }, db, site, token)
    },
    processDb: async (collection, body, filter?, sort?, skip?) => {
      let queryProcess: any = null
      let processDB: any = null
      if (body._id && !filter) {
        queryProcess = '$collection: String, $body: JSON'
        processDB = 'userUpdateById(collection: $collection, body: $body)'
      }
      else if (body._id && filter) {
        queryProcess = 'collection: String, body: JSON, filter: JSON, sort: JSON, skip: Int'
        processDB = 'userUpdateOne(collection: $collection, body: $body, filter: $filter, sort: $sort, skip: $skip)'
      }
      else if (!body._id) {
        queryProcess = '$collection: String, $body: JSON'
        processDB = 'userCreate(collection: $collection, body: $body)'
      }
      const query = `
          mutation processDB(${queryProcess}) {
              processDB: ${processDB}
          }
      `
      return await requestVuejx(query, {
        collection,
        body,
        filter,
        sort,
        skip,
      }, db, site, token)
    },
  }
}
