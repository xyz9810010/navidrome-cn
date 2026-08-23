import React from 'react'
import PropTypes from 'prop-types'
import { Button, useDataProvider, useNotify, useTranslate } from 'react-admin'
import { useDispatch } from 'react-redux'
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd'
import { openAddToPlaylist } from '../actions'

export const AddAllToPlaylistButton = ({ filters }) => {
  const translate = useTranslate()
  const dataProvider = useDataProvider()
  const dispatch = useDispatch()
  const notify = useNotify()
  filters = { ...filters, missing: false }

  const handleOnClick = () => {
    dataProvider
      .getList('song', {
        pagination: { page: 1, perPage: -1 },
        sort: { field: 'title', order: 'ASC' },
        filter: filters,
      })
      .then((res) => {
        const ids = res.data.map((song) => song.id)
        dispatch(openAddToPlaylist({ selectedIds: ids }))
      })
      .catch(() => {
        notify('ra.page.error', 'warning')
      })
  }

  return (
    <Button
      onClick={handleOnClick}
      label={translate('resources.song.actions.addAllToPlaylist')}
    >
      <PlaylistAddIcon />
    </Button>
  )
}

AddAllToPlaylistButton.propTypes = {
  filters: PropTypes.object,
}

AddAllToPlaylistButton.defaultProps = {
  filters: {},
}
