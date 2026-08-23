import React from 'react'
import { Datagrid, TextField, useTranslate } from 'react-admin'
import { useMediaQuery } from '@material-ui/core'
import { SimpleList, List } from '../common'
import config from '../config'

const TranscodingList = (props) => {
  const translate = useTranslate()
  const isXsmall = useMediaQuery((theme) => theme.breakpoints.down('xs'))
  return (
    <List
      {...props}
      exporter={false}
      bulkActionButtons={config.enableTranscodingConfig}
    >
      {isXsmall ? (
        <SimpleList
          primaryText={(r) => r.name}
          secondaryText={(r) =>
            `${translate('resources.transcoding.fields.format')}: ${r.targetFormat}`
          }
          tertiaryText={(r) => r.defaultBitRate}
        />
      ) : (
        <Datagrid rowClick={config.enableTranscodingConfig ? 'edit' : 'show'}>
          <TextField source="name" />
          <TextField source="targetFormat" />
          <TextField source="defaultBitRate" />
          <TextField source="command" />
        </Datagrid>
      )}
    </List>
  )
}

export default TranscodingList
