// const Promise = require(`bluebird`)
const {
  GraphQLObjectType,
  GraphQLList,
  GraphQLBoolean,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
} = require(`gatsby/graphql`)
const {
  queueImageResizing,
  base64,
  // fluid,
  fixed,
  // traceSVG,
} = require(`gatsby-plugin-webpconv`)

// const sharp = require(`sharp`)
const fs = require(`fs`)
const fsExtra = require(`fs-extra`)
const imageSize = require(`probe-image-size`)
const path = require(`path`)

// const DEFAULT_PNG_COMPRESSION_SPEED = 4

const {
  ImageWebpConvFormatType,
  // ImageCropFocusType,
  // DuotoneGradientType,
  // PotraceType,
  // ImageFitType,
} = require(`./types`)

function toArray(buf) {
  let arr = new Array(buf.length)

  for (let i = 0; i < buf.length; i++) {
    arr[i] = buf[i]
  }

  return arr
}

// const getTracedSVG = async ({ file, image, fieldArgs }) =>
//   traceSVG({
//     file,
//     args: { ...fieldArgs.traceSVG },
//     fileArgs: fieldArgs,
//   })

const fixedNodeType = ({
  type,
  pathPrefix,
  getNodeAndSavePathDependency,
  reporter,
  name,
  cache,
}) => {
  const FixedType = new GraphQLObjectType({
    name: name,
    fields: {
      base64: { type: GraphQLString },
      // tracedSVG: {
      //   type: GraphQLString,
      //   resolve: parent => getTracedSVG(parent),
      // },
      aspectRatio: { type: GraphQLFloat },
      width: { type: GraphQLInt },
      height: { type: GraphQLInt },
      src: { type: GraphQLString },
      srcSet: { type: GraphQLString },
      srcWebp: {
        type: GraphQLString,
        resolve: async ({ file, image, fieldArgs }) => {
          // If the file is already in webp format or should explicitly
          // be converted to webp, we do not create additional webp files
          if (file.extension === `webp` || fieldArgs.toFormat === `webp`) {
            return null
          }
          const args = { ...fieldArgs, pathPrefix, toFormat: `webp` }
          const fixedImage = await fixed({
            file,
            args,
            reporter,
            cache,
          })
          return fixedImage.src
        },
      },
      srcSetWebp: {
        type: GraphQLString,
        resolve: async ({ file, image, fieldArgs }) => {
          if (file.extension === `webp` || fieldArgs.toFormat === `webp`) {
            return null
          }
          const args = { ...fieldArgs, pathPrefix, toFormat: `webp` }
          const fixedImage = await fixed({
            file,
            args,
            reporter,
            cache,
          })
          return fixedImage.srcSet
        },
      },
      originalName: { type: GraphQLString },
    },
  })

  return {
    // Deferring the type at least get's me to the "InputType" Error...
    type: () => FixedType,
    args: {
      width: {
        type: GraphQLInt,
      },
      height: {
        type: GraphQLInt,
      },
      base64Width: {
        type: GraphQLInt,
      },
      // jpegProgressive: {
      //   type: GraphQLBoolean,
      //   defaultValue: true,
      // },
      // pngCompressionSpeed: {
      //   type: GraphQLInt,
      //   defaultValue: DEFAULT_PNG_COMPRESSION_SPEED,
      // },
      // grayscale: {
      //   type: GraphQLBoolean,
      //   defaultValue: false,
      // },
      // duotone: {
      //   type: DuotoneGradientType,
      //   defaultValue: false,
      // },
      // traceSVG: {
      //   type: PotraceType,
      //   defaultValue: false,
      // },
      quality: {
        type: GraphQLInt,
      },
      toFormat: {
        type: () => ImageWebpConvFormatType,
        defaultValue: ``,
      },
      toFormatBase64: {
        type: () => ImageWebpConvFormatType,
        defaultValue: ``,
      },
      // cropFocus: {
      //   type: ImageCropFocusType,
      //   defaultValue: sharp.strategy.attention,
      // },
      // rotate: {
      //   type: GraphQLInt,
      //   defaultValue: 0,
      // },
    },
    resolve: async (image, fieldArgs, context) => {
      const file = getNodeAndSavePathDependency(image.parent, context.path)
      const args = { ...fieldArgs, pathPrefix }
      const fixedImage = await fixed({
        file,
        args,
        reporter,
        cache,
      })

      return Object.assign({}, fixedImage, {
        fieldArgs: args,
        image,
        file,
      })
    },
  }
}

// const fluidNodeType = ({
//                          type,
//                          pathPrefix,
//                          getNodeAndSavePathDependency,
//                          reporter,
//                          name,
//                          cache,
//                        }) => {
//   return {
//     type: new GraphQLObjectType({
//       name: name,
//       fields: {
//         base64: { type: GraphQLString },
//         tracedSVG: {
//           type: GraphQLString,
//           resolve: parent => getTracedSVG(parent),
//         },
//         aspectRatio: { type: GraphQLFloat },
//         src: { type: GraphQLString },
//         srcSet: { type: GraphQLString },
//         srcWebp: {
//           type: GraphQLString,
//           resolve: ({ file, image, fieldArgs }) => {
//             if (image.extension === `webp` || fieldArgs.toFormat === `webp`) {
//               return null
//             }
//             const args = { ...fieldArgs, pathPrefix, toFormat: `webp` }
//             return Promise.resolve(
//               fluid({
//                 file,
//                 args,
//                 reporter,
//                 cache,
//               })
//             ).then(({ src }) => src)
//           },
//         },
//         srcSetWebp: {
//           type: GraphQLString,
//           resolve: ({ file, image, fieldArgs }) => {
//             if (image.extension === `webp` || fieldArgs.toFormat === `webp`) {
//               return null
//             }
//             const args = { ...fieldArgs, pathPrefix, toFormat: `webp` }
//             return Promise.resolve(
//               fluid({
//                 file,
//                 args,
//                 reporter,
//                 cache,
//               })
//             ).then(({ srcSet }) => srcSet)
//           },
//         },
//         sizes: { type: GraphQLString },
//         originalImg: { type: GraphQLString },
//         originalName: { type: GraphQLString },
//         presentationWidth: { type: GraphQLInt },
//         presentationHeight: { type: GraphQLInt },
//       },
//     }),
//     args: {
//       maxWidth: {
//         type: GraphQLInt,
//       },
//       maxHeight: {
//         type: GraphQLInt,
//       },
//       base64Width: {
//         type: GraphQLInt,
//       },
//       grayscale: {
//         type: GraphQLBoolean,
//         defaultValue: false,
//       },
//       jpegProgressive: {
//         type: GraphQLBoolean,
//         defaultValue: true,
//       },
//       pngCompressionSpeed: {
//         type: GraphQLInt,
//         defaultValue: DEFAULT_PNG_COMPRESSION_SPEED,
//       },
//       duotone: {
//         type: DuotoneGradientType,
//         defaultValue: false,
//       },
//       traceSVG: {
//         type: PotraceType,
//         defaultValue: false,
//       },
//       quality: {
//         type: GraphQLInt,
//       },
//       toFormat: {
//         type: ImageWebpConvFormatType,
//         defaultValue: ``,
//       },
//       toFormatBase64: {
//         type: ImageWebpConvFormatType,
//         defaultValue: ``,
//       },
//       cropFocus: {
//         type: ImageCropFocusType,
//         defaultValue: sharp.strategy.attention,
//       },
//       fit: {
//         type: ImageFitType,
//         defaultValue: sharp.fit.cover,
//       },
//       background: {
//         type: GraphQLString,
//         defaultValue: `rgba(0,0,0,1)`,
//       },
//       rotate: {
//         type: GraphQLInt,
//         defaultValue: 0,
//       },
//       sizes: {
//         type: GraphQLString,
//         defaultValue: ``,
//       },
//       srcSetBreakpoints: {
//         type: GraphQLList(GraphQLInt),
//         defaultValue: [],
//         description: `A list of image widths to be generated. Example: [ 200, 340, 520, 890 ]`,
//       },
//     },
//     resolve: (image, fieldArgs, context) => {
//       const file = getNodeAndSavePathDependency(image.parent, context.path)
//       const args = { ...fieldArgs, pathPrefix }
//       return Promise.resolve(
//         fluid({
//           file,
//           args,
//           reporter,
//           cache,
//         })
//       ).then(o =>
//         Object.assign({}, o, {
//           fieldArgs: args,
//           image,
//           file,
//         })
//       )
//     },
//   }
// }

module.exports = ({
  type,
  pathPrefix,
  getNodeAndSavePathDependency,
  reporter,
  cache,
}) => {
  if (type.name !== `ImageWebpConv`) {
    return {}
  }

  const nodeOptions = {
    type,
    pathPrefix,
    getNodeAndSavePathDependency,
    reporter,
    cache,
  }

  const fixedNode = fixedNodeType({
    name: `ImageWebpConvFixed`,
    ...nodeOptions,
  })
  // const fluidNode = fluidNodeType({ name: `ImageWebpConvFluid`, ...nodeOptions })

  const ImageWebpConvOriginal = new GraphQLObjectType({
    name: `ImageWebpConvOriginal`,
    fields: {
      width: { type: GraphQLInt },
      height: { type: GraphQLInt },
      src: { type: GraphQLString },
    },
  })

  const ImageWebpConvResize = new GraphQLObjectType({
    name: `ImageWebpConvResize`,
    fields: {
      src: { type: GraphQLString },
      // tracedSVG: {
      //   type: GraphQLString,
      //   resolve: parent => getTracedSVG(parent),
      // },
      width: { type: GraphQLInt },
      height: { type: GraphQLInt },
      aspectRatio: { type: GraphQLFloat },
      originalName: { type: GraphQLString },
    },
  })

  return {
    fixed: () => fixedNode,
    // fluid: fluidNode,
    original: {
      type: () => ImageWebpConvOriginal,
      args: {},
      resolve: async (image, fieldArgs, context) => {
        const details = getNodeAndSavePathDependency(image.parent, context.path)
        const dimensions = imageSize.sync(
          toArray(fs.readFileSync(details.absolutePath))
        )
        const imageName = `${details.name}-${image.internal.contentDigest}${
          details.ext
        }`
        const publicPath = path.join(
          process.cwd(),
          `public`,
          `static`,
          imageName
        )

        if (!fsExtra.existsSync(publicPath)) {
          fsExtra.copy(details.absolutePath, publicPath, err => {
            if (err) {
              console.error(
                `error copying file from ${
                  details.absolutePath
                } to ${publicPath}`,
                err
              )
            }
          })
        }

        return {
          width: dimensions.width,
          height: dimensions.height,
          src: `${pathPrefix}/static/${imageName}`,
        }
      },
    },
    resize: {
      type: () => ImageWebpConvResize,
      args: {
        width: {
          type: GraphQLInt,
        },
        height: {
          type: GraphQLInt,
        },
        quality: {
          type: GraphQLInt,
        },
        // jpegProgressive: {
        //   type: GraphQLBoolean,
        //   defaultValue: true,
        // },
        // pngCompressionLevel: {
        //   type: GraphQLInt,
        //   defaultValue: 9,
        // },
        // pngCompressionSpeed: {
        //   type: GraphQLInt,
        //   defaultValue: DEFAULT_PNG_COMPRESSION_SPEED,
        // },
        // grayscale: {
        //   type: GraphQLBoolean,
        //   defaultValue: false,
        // },
        // duotone: {
        //   type: DuotoneGradientType,
        //   defaultValue: false,
        // },
        base64: {
          type: GraphQLBoolean,
          defaultValue: false,
        },
        // traceSVG: {
        //   type: PotraceType,
        //   defaultValue: false,
        // },
        toFormat: {
          type: ImageWebpConvFormatType,
          defaultValue: ``,
        },
        // cropFocus: {
        //   type: ImageCropFocusType,
        //   defaultValue: sharp.strategy.attention,
        // },
        // rotate: {
        //   type: GraphQLInt,
        //   defaultValue: 0,
        // },
      },
      resolve: async (image, fieldArgs, context) => {
        const file = getNodeAndSavePathDependency(image.parent, context.path)
        const args = { ...fieldArgs, pathPrefix }
        if (fieldArgs.base64) {
          return await base64({
            file,
            cache,
          })
        } else {
          const o = queueImageResizing({
            file,
            args,
          })
          return Object.assign({}, o, {
            image,
            file,
            fieldArgs: args,
          })
        }
      },
    },
  }
}
