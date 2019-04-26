const fs = require(`fs-extra`)

exports.setFieldsOnGraphQLNodeType = require(`./extend-node-type`)

exports.onPreExtractQueries = async ({ store, getNodesByType }) => {
  const program = store.getState().program

  // Check if there are any ImageWebpConv nodes. If so add fragments for ImageWebpConv.
  // The fragment will cause an error if there are no ImageWebpConv nodes.
  if (getNodesByType(`ImageWebpConv`).length === 0) {
    console.error('No ImageWebpConv nodes...')
    return
  }

  // We have ImageWebpConv nodes so let's add our fragments to .cache/fragments.
  await fs.copy(
    require.resolve(
      `${
        program.directory
        }/plugins/gatsby-transformer-webpconv/fragments.js`
    ),
    `${program.directory}/.cache/fragments/image-webpconv-fragments.js`
  )
  // await fs.copy(
  //   require.resolve(`gatsby-transformer-webpconv/src/fragments.js`),
  //   `${program.directory}/.cache/fragments/image-webpconv-fragments.js`
  // )
}

const supportedExtensions = {
  gif: true,
  // webp: true,
}

/**
 * TODO: Why does it work in the `plugins` subfolder of a site but not here?
 *
 {
  allSitePlugin(filter: { name: { regex: "/webpconv|sharp/" } }) {
    edges {
      node {
        id
        name
        resolve
        nodeAPIs
      }
    }
  }
}
 */
// TODO: look further into schema.buildObjectType() / sourceNodes at
// TODO: [New Schema Customization API](https://www.gatsbyjs.org/blog/2019-03-18-releasing-new-schema-customization/)
const onCreateNode = async ({ node, actions, ...helpers }) => {
  const { createNode, createParentChildLink } = actions
  const { createNodeId, createContentDigest } = helpers

  if (!supportedExtensions[node.extension]) {
    return
  }

  const imageNode = {
    id: createNodeId(`${node.id} >>> ImageWebpConv`),
    children: [],
    parent: node.id,
    internal: {
      contentDigest: createContentDigest(node),
      type: `ImageWebpConv`,
    },
  }

  createNode(imageNode)
  createParentChildLink({ parent: node, child: imageNode })
}

const sourceNodes = async ({ actions }) => {
  const { createTypes } = actions
  const typeDefs = `
    type imageWebpConvFixed {
      base64: String
      aspectRatio: Float
      width: Int
      height: Int
      src: String
      srcSet: String
      originalName: String
    }

    type imageWebpConvOriginal {
      width: Int
      height: Int
      src: String
    }

    type imageWebpConvResize {
      src: String
      width: Int
      height: Int
      aspectRatio: Float
      originalName: String
    }
  `
  createTypes(typeDefs)
}

exports.sourceNodes = sourceNodes
exports.onCreateNode = onCreateNode
