import React from 'react'
import PropTypes from 'prop-types'
import { Button, useTranslate } from 'react-admin'
import { useHistory } from 'react-router-dom'
import ArrowBackIcon from '@material-ui/icons/ArrowBack'
import { makeStyles } from '@material-ui/core'

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
}))

export const BackButton = ({ fallback }) => {
  const translate = useTranslate()
  const history = useHistory()
  const classes = useStyles()

  const handleBack = () => {
    if (history.length > 2) {
      history.goBack()
    } else {
      history.push(fallback)
    }
  }

  return (
    <Button
      onClick={handleBack}
      label={translate('ra.action.back')}
      className={classes.root}
      size="small"
    >
      <ArrowBackIcon />
    </Button>
  )
}

BackButton.propTypes = {
  fallback: PropTypes.string.isRequired,
}
